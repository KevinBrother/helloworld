import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './index.css';

const getItems = (count) =>
  Array.from({ length: count }, (v, k) => k).map((k) => ({
    id: `item-${k}`,
    content: `item ${k}`
  }));

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

const getItemStyle = (isDragging, draggableStyle) => ({
  ...draggableStyle
});

export default function DropAble() {
  const [items, setItems] = useState(getItems(5));

  function onDragEnd(result) {
    // dropped outside the list
    if (!result.destination) {
      return;
    }
    const recorderItems = reorder(
      items,
      result.source.index,
      result.destination.index
    );

    setItems(recorderItems);
  }

  return (
    <div style={{ width: '500px' }}>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="droppable-header">
          <div>标签</div>
          <div>operations</div>
        </div>
        <Droppable droppableId="tag-droppable">
          {(provided, snapshot) => (
            <div
              className="droppable-wrap"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      className="draggable-item"
                      {...provided.draggableProps}
                      ref={provided.innerRef}
                      style={getItemStyle(
                        snapshot.isDragging,
                        provided.draggableProps.style
                      )}
                    >
                      <div className="tag-content">
                        {item.content} {item.id}
                      </div>
                      <div>
                        first
                        <div {...provided.dragHandleProps}>..</div>
                        end
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
